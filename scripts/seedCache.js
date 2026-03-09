import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_FILE_PATH = path.join(__dirname, '../server/data/errorCache.json');

// --- Helper: Generate Signature ---
// Matches the logic in errorAnalyzer.service.js to ensure hits
function generateSignature(normalizedStack) {
  return crypto
    .createHash('sha256')
    .update(normalizedStack)
    .digest('hex');
}

// --- The Knowledge Base: 30 Common Errors ---
const commonErrors = [
  // --- MONGODB / MONGOOSE ERRORS ---
  {
    name: "MongoTimeoutError",
    stackOverride: "MongooseServerSelectionError: Connect to cluster0.mongodb.net:27017 timed out",
    diagnosis: "MongoDB Connection Timeout. The application could not reach the database cluster within the default 30s window.",
    fix: `// Check your IP Whitelist in MongoDB Atlas
// Ensure your current IP is allowed in Network Access`
  },
  {
    name: "MongoAuthError",
    stackOverride: "MongoServerError: bad auth : Authentication failed.",
    diagnosis: "MongoDB Authentication Failed. The provided username or password in the connection string is incorrect.",
    fix: `// specific to .env file
// Check MONGODB_URI format: mongodb+srv://<user>:<password>@cluster...
// Ensure special characters in password are URL encoded`
  },
  {
    name: "DuplicateKeyError",
    stackOverride: "MongoServerError: E11000 duplicate key error collection: users index: email_1 dup key",
    diagnosis: "Duplicate Key Error. Attempted to create a record with a unique field (likely 'email') that already exists.",
    fix: `try {
  await User.create(userData);
} catch (err) {
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Email already exists' });
  }
}`
  },
  {
    name: "ValidatorError",
    stackOverride: "ValidationError: User validation failed: email: Path `email` is required.",
    diagnosis: "Mongoose Validation Error. A required field was missing from the document payload.",
    fix: `// Ensure payload contains all required fields
const { email, password } = req.body;
if (!email) {
  throw new Error('Email is required');
}`
  },
  {
    name: "CastError",
    stackOverride: "CastError: Cast to ObjectId failed for value \"123\" (type string) at path \"_id\" for model \"User\"",
    diagnosis: "Invalid MongoDB ObjectId. The ID provided in the route parameter is not a valid 24-character hex string.",
    fix: `const mongoose = require('mongoose');
if (!mongoose.Types.ObjectId.isValid(id)) {
  return res.status(400).json({ message: 'Invalid ID format' });
}`
  },

  // --- EXPRESS / NODE.js ERRORS ---
  {
    name: "PortInUse",
    stackOverride: "Error: listen EADDRINUSE: address already in use :::5000",
    diagnosis: "Port Already In Use. Another process is already running on the specified port (usually 5000 or 3000).",
    fix: `// Kill the process using the port (Linux/Mac)
// terminal: lsof -i :5000 | xargs kill -9

// OR change the port in .env
PORT=5001`
  },
  {
    name: "BodyParserError",
    stackOverride: "SyntaxError: Unexpected token } in JSON at position 42",
    diagnosis: "Malformed JSON Payload. The request body contains invalid JSON syntax (e.g., missing quotes or trailing commas).",
    fix: `// User needs to fix their request body
// Ensure standard JSON formatting (double quotes keys)`
  },
  {
    name: "CorsError",
    stackOverride: "Access to fetch at '...' from origin '...' has been blocked by CORS policy",
    diagnosis: "CORS Policy Block. The frontend origin is not whitelisted in the server's CORS configuration.",
    fix: `app.use(cors({
  origin: ['http://localhost:5173', 'https://your-domain.com'],
  credentials: true
}));`
  },
  {
    name: "MulterLimitError",
    stackOverride: "MulterError: File too large",
    diagnosis: "File Upload Limit Exceed. The uploaded file size exceeds the configured limit in Multer.",
    fix: `const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 } // Increase limit to 5MB
});`
  },
  {
    name: "UndefinedRoute",
    stackOverride: "Error: Cannot POST /api/v1/user/logn",
    diagnosis: "404 Not Found. The requested route endpoint does not exist on the server (check for typos).",
    fix: `// Check route definitions
// user/login vs user/logn
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});`
  },

  // --- JAVASCRIPT / LOGIC ERRORS ---
  {
    name: "NullPointer",
    stackOverride: "TypeError: Cannot read properties of undefined (reading 'map')",
    diagnosis: "Accessed property of undefined. Attempted to .map() over an array that is currently undefined.",
    fix: `// Add optional chaining or default value
const items = data?.items || [];
items.map(item => ...)`
  },
  {
    name: "NullPointer2",
    stackOverride: "TypeError: Cannot read properties of null (reading 'toString')",
    diagnosis: "Accessed property of null. The variable is explicitly null when an object was expected.",
    fix: `if (value !== null) {
  console.log(value.toString());
}`
  },
  {
    name: "AssignmentToConstant",
    stackOverride: "TypeError: Assignment to constant variable.",
    diagnosis: "Reassigned Const. Attempted to change the value of a variable declared with 'const'.",
    fix: `// Change 'const' to 'let'
let count = 0;
count = 1;`
  },
  {
    name: "IsNotFunction",
    stackOverride: "TypeError: user.save is not a function",
    diagnosis: "Method Not Found. 'user.save' is not a function. The object 'user' might be a plain JSON object, not a Mongoose Document.",
    fix: `// Ensure you are operating on a Mongoose Model instance
const user = new User(req.body);
await user.save();`
  },
  {
    name: "CircularDependency",
    stackOverride: "ReferenceError: Cannot access 'User' before initialization",
    diagnosis: "Circular Dependency / Hoisting Issue. A module requires another module that requires the first one.",
    fix: `// Check import order
// Break the circular dependency by moving shared logic to a third file`
  },

  // --- AUTHENTICATION ERRORS ---
  {
    name: "JwtExpired",
    stackOverride: "TokenExpiredError: jwt expired",
    diagnosis: "JWT Expired. The access token provided in the Authorization header has passed its expiration time.",
    fix: `// Client: Refresh the token using the refresh token endpoint
// Server:
if (err.name === 'TokenExpiredError') {
  return res.status(401).json({ code: 'TOKEN_EXPIRED' });
}`
  },
  {
    name: "JwtMalformed",
    stackOverride: "JsonWebTokenError: jwt malformed",
    diagnosis: "Malformed JWT. The token structure is invalid (missing parts or corrupted header/tail).",
    fix: `// Ensure the header format is "Bearer <token>"
const token = req.headers.authorization.split(' ')[1];`
  },
  {
    name: "JwtInvalidSignature",
    stackOverride: "JsonWebTokenError: invalid signature",
    diagnosis: "Invalid JWT Signature. The token was signed with a different secret key than the one on the server.",
    fix: `// Check JWT_SECRET in .env
// Ensure it matches the one used to generate the token`
  },
  {
    name: "BcryptHashError",
    stackOverride: "Error: data and hash arguments required",
    diagnosis: "Bcrypt Error. Attempted to compare a password against an undefined hash.",
    fix: `// Ensure user has a password set
if (!user.password) {
  throw new Error('User has no password set');
}
await bcrypt.compare(candidate, user.password);`
  },

  // --- ASYNC / PROMISE ERRORS ---
  {
    name: "UnhandledRejection",
    stackOverride: "UnhandledPromiseRejectionWarning: Unhandled promise rejection.",
    diagnosis: "Unhandled Promise Rejection. A Promise rejected but no .catch() or try/catch block handled it.",
    fix: `// Wrap async code in try/catch
try {
  await asyncOperation();
} catch (error) {
  next(error);
}`
  },
  {
    name: "AwaitInLoop",
    stackOverride: "(Lint Warning/Performance) await inside loop",
    diagnosis: "Sequential Await in Loop. Awaiting inside a loop causes requests to run sequentially instead of parallel.",
    fix: `// Use Promise.all for parallel execution
const results = await Promise.all(items.map(async (item) => {
  return await process(item);
}));`
  },
  {
    name: "AsyncCallbackError",
    stackOverride: "Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client",
    diagnosis: "Headers Already Sent. Attempted to send a response twice (e.g., not returning after res.json).",
    fix: `// Add 'return' statement
if (error) {
  return res.status(400).json({ error }); 
}
res.json({ success: true });`
  },

  // --- SYSTEM / OS ERRORS ---
  {
    name: "OutOfMemory",
    stackOverride: "FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory",
    diagnosis: "Node.js Heap Out of Memory. The process used more RAM than the V8 engine limit (default ~1.5GB).",
    fix: `// Increase max info space size
node --max-old-space-size=4096 server.js`
  },
  {
    name: "FileSystemError",
    stackOverride: "Error: ENOENT: no such file or directory, open '/path/to/file'",
    diagnosis: "File Not Found (ENOENT). The application tried to read a file that does not exist at the specified path.",
    fix: `// Check absolute vs relative paths
const filePath = path.join(__dirname, 'data', 'file.txt');`
  },
  {
    name: "PermissionDenied",
    stackOverride: "Error: EACCES: permission denied, mkdir '/var/www'",
    diagnosis: "Permission Denied (EACCES). The node process does not have OS permissions to write to this directory.",
    fix: `// Run with sudo (dev) or change folder ownership (prod)
chown -R user:group /var/www`
  },

  // --- REACT / FRONTEND ERRORS (Often caught by BFF) ---
  {
    name: "ReactKeyProp",
    stackOverride: "Warning: Each child in a list should have a unique \"key\" prop.",
    diagnosis: "Missing React Key Prop. Rendered a list of items without a unique 'key' attribute.",
    fix: `{items.map(item => (
  <div key={item.id}>{item.name}</div>
))}`
  },
  {
    name: "ReactHooksOrder",
    stackOverride: "Error: Rendered fewer hooks than expected. This may be caused by an accidental early return statement.",
    diagnosis: "React Hook Rules Violation. Hooks must be called in the exact same order every render (no conditions/loops).",
    fix: `// Move conditional logic AFTER hooks
const data = useData(); // 1. Hook
if (!data) return null; // 2. Condition
return <div>{data}</div>;`
  },
  {
    name: "HydrationError",
    stackOverride: "Error: Text content does not match server-rendered HTML.",
    diagnosis: "Hydration Mismatch. The HTML generated on the server (SSR) differs from what the client rendered initially.",
    fix: `// Ensure initial state matches server
// Avoid using window/localStorage in initial render`
  },
  {
    name: "StateUpdateUnmounted",
    stackOverride: "Warning: Can't perform a React state update on an unmounted component.",
    diagnosis: "Memory Leak / Unmounted State Update. Attempted to set state after a component has been destroyed.",
    fix: `useEffect(() => {
  let mounted = true;
  apiCall().then(data => {
    if (mounted) setData(data);
  });
  return () => { mounted = false };
}, []);`
  },
  {
    name: "UndefinedMap",
    stackOverride: "TypeError: Cannot read properties of undefined (reading 'map')",
    diagnosis: "Undefined .map(). Tried to map over an undefined variable in JSX.",
    fix: `{data && data.map(item => (
  <Item key={item.id} />
))}
// OR default value
{(data || []).map(...)}`
  }
];

// --- Main Seed Function ---
const seedCache = async () => {
    console.log('🌱 Starting Auto-Medic Cache Seeding...');

    // 1. Ensure Directory
    try {
        await fs.mkdir(path.dirname(CACHE_FILE_PATH), { recursive: true });
    } catch (e) { /* ignore */ }

    // 2. Load Existing Cache
    let existingCache = {};
    try {
        const fileContent = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
        existingCache = JSON.parse(fileContent);
        console.log(`📂 Loaded ${Object.keys(existingCache).length} existing entries.`);
    } catch (error) {
        console.log('📂 No existing cache found. Creating new.');
    }

    // 3. Merge New Entries
    let addedCount = 0;
    
    for (const errorCase of commonErrors) {
        // Generate signature from the "stackOverride" which acts as our normalized template
        const signature = generateSignature(errorCase.stackOverride);
        
        if (!existingCache[signature]) {
            existingCache[signature] = {
                originalError: errorCase.stackOverride,
                diagnosis: errorCase.diagnosis,
                suggestedFix: errorCase.fix,
                severity: "MEDIUM", // Default
                cached: true,
                source: "SEED_SCRIPT",
                timestamp: new Date().toISOString()
            };
            addedCount++;
        }
    }

    // 4. Save Back to Disk
    try {
        await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(existingCache, null, 2));
        console.log(`✅ Cache seeding complete!`);
        console.log(`   Added: ${addedCount} new signatures`);
        console.log(`   Total: ${Object.keys(existingCache).length} cached solutions`);
    } catch (error) {
        console.error('❌ Failed to save cache:', error);
    }
};

// Run
seedCache();
