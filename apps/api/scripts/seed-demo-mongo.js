/**
 * apps/api/scripts/seed-demo-mongo.js
 * CommonJS seed script for local MongoDB databases:
 * 1. servx_local: admins, completed attackpathsjobs, activitylogs, userconnections
 * 2. servx_demo_shop: customers, orders, products, audit_logs (for the Databases explorer)
 */

const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const AttackPathsJob = require('../models/AttackPathsJob');
const UserConnection = require('../models/UserConnection');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');

const MAIN_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27019/servx_local';
const SHOP_URI = process.env.MONGODB_SHOP_URI || 'mongodb://127.0.0.1:27019/servx_demo_shop';

function verifyLocalhost(uri) {
  let hostname = '';
  try {
    const pseudoUrl = uri.replace(/^mongodb(\+srv)?:\/\//, 'http://');
    const parsed = new URL(pseudoUrl);
    hostname = parsed.hostname;
  } catch (err) {
    const match = uri.match(/@([^:\/?#]+)/) || uri.match(/:\/\/([^:\/?#]+)/);
    if (match) hostname = match[1];
  }
  if (hostname !== '127.0.0.1' && hostname !== 'localhost') {
    console.error(`❌ REFUSING to run seed against non-local host: "${hostname}" in ${uri}`);
    process.exit(1);
  }
}

async function seedServxLocal() {
  console.log(`📡 Connecting to main MongoDB: ${MAIN_URI}`);
  verifyLocalhost(MAIN_URI);
  await mongoose.connect(MAIN_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('✅ Connected to servx_local');

  // ─── 1. Admins ──────────────────────────────────────────────────────────────
  const admins = [
    {
      id: '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11', // Alex Rivera
      email: 'alex@servx.dev',
      role: 'owner',
      addedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
    },
    {
      id: 'a2b3c4d5-2222-4444-8888-111122223333', // Priya Nair
      email: 'priya@servx.dev',
      role: 'editor',
      addedAt: new Date(Date.now() - 20 * 24 * 3600 * 1000),
    },
    {
      id: 'b3c4d5e6-3333-5555-9999-222233334444', // Sam Okafor
      email: 'sam@servx.dev',
      role: 'viewer',
      addedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000),
    },
  ];

  for (const a of admins) {
    await Admin.findOneAndUpdate({ id: a.id }, a, { upsert: true, new: true });
    // Also seed User legacy model for displayName/avatar
    await User.findOneAndUpdate(
      { id: a.id },
      {
        id: a.id,
        email: a.email,
        name: a.email === 'alex@servx.dev' ? 'Alex Rivera' : a.email === 'priya@servx.dev' ? 'Priya Nair' : 'Sam Okafor',
        avatarUrl: a.email === 'alex@servx.dev' ? 'https://api.dicebear.com/9.x/initials/svg?seed=Alex%20Rivera&backgroundColor=0d9488' : undefined,
      },
      { upsert: true }
    );
  }
  console.log('✔ Seeded 3 admin records in servx_local');

  // ─── 2. Gmail UserConnection ────────────────────────────────────────────────
  await UserConnection.findOneAndUpdate(
    { ownerUid: '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11', provider: 'Google' },
    {
      ownerUid: '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
      provider: 'Google',
      name: 'Gmail Integration',
      encryptedConfig: '{}',
      iv: 'seed',
      token: 'fake-local-demo-refresh-token',
      isActive: true,
      status: 'connected',
      updatedAt: new Date(),
    },
    { upsert: true, new: true, strict: false }
  );
  console.log('✔ Seeded Gmail UserConnection');

  // ─── 3. AttackPathsJob ──────────────────────────────────────────────────────
  // Fully populate findings, candidates, and 3D graph artifact for checkout-api
  const findings = [
    {
      id: 'finding-1',
      severity: 'CRITICAL',
      title: 'SQL Injection via Unsanitized Order Filter',
      detail: 'Untrusted user query parameter req.query.filter is concatenated directly into SQL statement in orderService without parameterization.',
      file: 'src/services/orderService.ts:74',
      source: 'sast',
    },
    {
      id: 'finding-2',
      severity: 'CRITICAL',
      title: 'Hardcoded Stripe Live Secret Key in Source',
      detail: 'Found production payment gateway secret key "sk_live_demo99214..." committed in repository configuration.',
      file: 'src/config/payments.ts:18',
      source: 'secrets',
    },
    {
      id: 'finding-3',
      severity: 'HIGH',
      title: 'Server-Side Request Forgery (SSRF) in Webhook Dispatcher',
      detail: 'Outbound HTTP dispatch executes requests to user-controlled callback URLs without blocking private IPv4 subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16).',
      file: 'src/controllers/webhookController.ts:52',
      source: 'sast',
    },
    {
      id: 'finding-4',
      severity: 'HIGH',
      title: 'Broken Object Level Authorization (BOLA) in Order Lookup',
      detail: 'Endpoint /api/orders/:id permits reading sensitive customer order details by guessable UUID without validating requester tenant context.',
      file: 'src/routes/orders.ts:29',
      source: 'sast',
    },
    {
      id: 'finding-5',
      severity: 'MEDIUM',
      title: 'Vulnerable Dependency: jsonwebtoken < 9.0.0',
      detail: 'jsonwebtoken prior to 9.0.0 is vulnerable to algorithm confusion and verification bypass attacks (CVE-2022-23529).',
      file: 'package.json:34',
      source: 'dependencies',
    },
    {
      id: 'finding-6',
      severity: 'MEDIUM',
      title: 'Missing Rate Limiter on Checkout Process Route',
      detail: 'No rate limiting middleware protects /api/checkout/process against automated card verification and brute-force replay.',
      file: 'src/routes/checkout.ts:15',
      source: 'cspm',
    },
  ];

  const graphArtifact = {
    candidates: [
      {
        id: 'candidate-1',
        route: 'POST /api/orders/search',
        routeFile: 'src/routes/orders.ts:42',
        authBoundary: 'present',
        findingId: 'finding-1',
        findingTitle: 'SQL Injection via Unsanitized Order Filter',
        findingFile: 'src/services/orderService.ts:74',
        severity: 'CRITICAL',
        confidence: 'partial',
        note: 'User query flows from req.query.filter into raw SQL string in orderService.',
      },
      {
        id: 'candidate-2',
        route: 'POST /api/checkout/process',
        routeFile: 'src/routes/checkout.ts:15',
        authBoundary: 'present',
        findingId: 'finding-2',
        findingTitle: 'Hardcoded Stripe Live Secret Key in Source',
        findingFile: 'src/config/payments.ts:18',
        severity: 'CRITICAL',
        confidence: 'partial',
        note: 'Hardcoded payment credential used by paymentProcessor during order finalization.',
      },
      {
        id: 'candidate-3',
        route: 'POST /api/webhooks/deliver',
        routeFile: 'src/routes/webhooks.ts:18',
        authBoundary: 'not_detected',
        findingId: 'finding-3',
        findingTitle: 'Server-Side Request Forgery (SSRF) in Webhook Dispatcher',
        findingFile: 'src/controllers/webhookController.ts:52',
        severity: 'HIGH',
        confidence: 'partial',
        note: 'Unvalidated destination URL dispatched directly via axios.post without private IP blocklist.',
      },
      {
        id: 'candidate-4',
        route: 'GET /api/orders/:id',
        routeFile: 'src/routes/orders.ts:29',
        authBoundary: 'not_detected',
        findingId: 'finding-4',
        findingTitle: 'Broken Object Level Authorization (BOLA) in Order Lookup',
        findingFile: 'src/routes/orders.ts:29',
        severity: 'HIGH',
        confidence: 'partial',
        note: 'Direct object reference to orders database collection without tenant boundary verification.',
      },
      {
        id: 'candidate-5',
        route: 'POST /api/checkout/process',
        routeFile: 'src/routes/checkout.ts:15',
        authBoundary: 'present',
        findingId: 'finding-6',
        findingTitle: 'Missing Rate Limiter on Checkout Process Route',
        findingFile: 'src/routes/checkout.ts:15',
        severity: 'MEDIUM',
        confidence: 'partial',
        note: 'Payment submission endpoint lacks token bucket or sliding window rate limiting.',
      },
    ],
    nodes: [
      { id: 'node-route-checkout', label: 'POST /api/checkout/process', type: 'route', layer: 'ingress', category: 'api' },
      { id: 'node-route-search', label: 'POST /api/orders/search', type: 'route', layer: 'ingress', category: 'api' },
      { id: 'node-route-orders', label: 'GET /api/orders/:id', type: 'route', layer: 'ingress', category: 'api' },
      { id: 'node-route-webhooks', label: 'POST /api/webhooks/deliver', type: 'route', layer: 'ingress', category: 'api' },
      { id: 'node-auth-mw', label: 'authMiddleware', type: 'middleware', layer: 'security', category: 'auth' },
      { id: 'node-ctrl-checkout', label: 'checkoutController', type: 'handler', layer: 'app', category: 'controller' },
      { id: 'node-svc-orders', label: 'orderService', type: 'handler', layer: 'app', category: 'service' },
      { id: 'node-svc-payments', label: 'paymentProcessor', type: 'handler', layer: 'app', category: 'service' },
      { id: 'node-svc-webhooks', label: 'webhookDispatcher', type: 'handler', layer: 'app', category: 'service' },
      { id: 'node-sink-mongo', label: 'MongoDB: orders', type: 'sink', layer: 'data', category: 'database' },
      { id: 'node-sink-postgres', label: 'PostgreSQL: payments', type: 'sink', layer: 'data', category: 'database' },
      { id: 'node-sink-ssrf', label: 'External Webhook HTTP', type: 'sink', layer: 'external', category: 'network' },
    ],
    edges: [
      { id: 'edge-1', source: 'node-route-checkout', target: 'node-auth-mw', type: 'controlflow' },
      { id: 'edge-2', source: 'node-auth-mw', target: 'node-ctrl-checkout', type: 'controlflow' },
      { id: 'edge-3', source: 'node-ctrl-checkout', target: 'node-svc-payments', type: 'dataflow', isAttackPath: true, findingId: 'finding-2' },
      { id: 'edge-4', source: 'node-svc-payments', target: 'node-sink-postgres', type: 'dataflow' },
      { id: 'edge-5', source: 'node-route-search', target: 'node-auth-mw', type: 'controlflow' },
      { id: 'edge-6', source: 'node-auth-mw', target: 'node-svc-orders', type: 'controlflow' },
      { id: 'edge-7', source: 'node-svc-orders', target: 'node-sink-mongo', type: 'dataflow', isAttackPath: true, findingId: 'finding-1' },
      { id: 'edge-8', source: 'node-route-orders', target: 'node-svc-orders', type: 'dataflow', isAttackPath: true, findingId: 'finding-4' },
      { id: 'edge-9', source: 'node-route-webhooks', target: 'node-svc-webhooks', type: 'controlflow' },
      { id: 'edge-10', source: 'node-svc-webhooks', target: 'node-sink-ssrf', type: 'dataflow', isAttackPath: true, findingId: 'finding-3' },
      { id: 'edge-11', source: 'node-ctrl-checkout', target: 'node-svc-orders', type: 'controlflow' },
      { id: 'edge-12', source: 'node-route-checkout', target: 'node-ctrl-checkout', type: 'dataflow', isAttackPath: true, findingId: 'finding-6' },
    ],
  };

  const toolStatuses = [
    { tool: 'semgrep', status: 'ran', findingsCount: 3, error: null },
    { tool: 'gitleaks', status: 'ran', findingsCount: 1, error: null },
    { tool: 'trivy', status: 'ran', findingsCount: 1, error: null },
    { tool: 'checkov', status: 'ran', findingsCount: 1, error: null },
  ];

  await AttackPathsJob.findOneAndUpdate(
    { repoFullName: 'servx-lab/checkout-api', profile: 'deep_repo' },
    {
      requestedBy: '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
      repoId: '100000002',
      repoFullName: 'servx-lab/checkout-api',
      targetUrl: 'https://checkout.servx-demo.dev',
      scanTypes: ['supply_chain', 'sast', 'secrets'],
      analysisDepth: 2,
      deviceId: 'servx-demo-device-01',
      idempotencyKey: 'idemp-seed-checkout-001',
      profile: 'deep_repo',
      dispatchState: 'accepted',
      status: 'completed',
      phaseMessage: 'Report ready',
      progressPct: 100,
      results: findings,
      scanArtifacts: [],
      toolStatuses,
      graphArtifact,
      assuranceSummary: {
        totalRulesEvaluated: 142,
        verifiedCleanPaths: 38,
        potentialAttackPaths: 5,
      },
      scanMetrics: {
        durationMs: 45200,
        queueWaitMs: 2400,
        attemptCount: 1,
      },
      reportArtifactUrl: '',
      lastError: '',
      startedAt: new Date(Date.now() - 3600000),
      completedAt: new Date(Date.now() - 3550000),
    },
    { upsert: true, new: true }
  );
  console.log('✔ Seeded completed attackpathsjobs doc for servx-lab/checkout-api');

  // ─── 4. Activity Logs ───────────────────────────────────────────────────────
  await ActivityLog.deleteMany({ installationId: 'servx-local-seed' });
  await ActivityLog.insertMany([
    {
      installationId: 'servx-local-seed',
      module: 'auth',
      event: 'Zero-Trust device authentication approved (Chrome on Linux)',
      severity: 'normal',
      metadata: { user: 'alex@servx.dev', device: 'servx-demo-device-01', ip: '127.0.0.1' },
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
    },
    {
      installationId: 'servx-local-seed',
      module: 'repositories',
      event: 'Repository PIN verified: svx_test_pin_123',
      severity: 'normal',
      metadata: { repo: 'servx-lab/servx-web', status: 'VERIFIED' },
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
    },
    {
      installationId: 'servx-local-seed',
      module: 'auto-medic',
      event: 'Incident DEP-0f8fad5b-d9cb-469f-a165-70867728950e-dpl_vcl_auth991 detected',
      severity: 'critical',
      metadata: { provider: 'Vercel', error: 'Missing NEXT_PUBLIC_AUTH_DOMAIN' },
      timestamp: new Date(Date.now() - 2 * 3600 * 1000),
    },
    {
      installationId: 'servx-local-seed',
      module: 'exposure',
      event: 'Perimeter scan completed for servx-demo.dev',
      severity: 'normal',
      metadata: { assetsDiscovered: 10, criticalFindings: 3 },
      timestamp: new Date(Date.now() - 3 * 3600 * 1000),
    },
    {
      installationId: 'servx-local-seed',
      module: 'attack-paths',
      event: 'Deep repository security analysis completed for servx-lab/checkout-api',
      severity: 'normal',
      metadata: { durationMs: 45200, findings: 6 },
      timestamp: new Date(Date.now() - 3550000),
    },
  ]);
  console.log('✔ Seeded ActivityLogs in servx_local');
}

async function seedDemoShop() {
  console.log(`📡 Connecting to demo shop database: ${SHOP_URI}`);
  verifyLocalhost(SHOP_URI);
  const shopConn = await mongoose.createConnection(SHOP_URI, { serverSelectionTimeoutMS: 5000 }).asPromise();
  console.log('✅ Connected to servx_demo_shop');

  const customersCol = shopConn.collection('customers');
  const productsCol = shopConn.collection('products');
  const ordersCol = shopConn.collection('orders');
  const auditLogsCol = shopConn.collection('audit_logs');

  await customersCol.deleteMany({ is_seed: true });
  await productsCol.deleteMany({ is_seed: true });
  await ordersCol.deleteMany({ is_seed: true });
  await auditLogsCol.deleteMany({ is_seed: true });

  // 20 Customers
  const customerNames = [
    ['Elena Vance', 'elena.vance@example.com', 'tier_enterprise', '+1-555-0101', 'Seattle, WA'],
    ['Marcus Brody', 'marcus.brody@example.com', 'tier_pro', '+1-555-0102', 'Austin, TX'],
    ['Siddharth Rao', 'sid.rao@example.com', 'tier_enterprise', '+1-555-0103', 'San Francisco, CA'],
    ['Chloe Decker', 'chloe.decker@example.com', 'tier_starter', '+1-555-0104', 'Los Angeles, CA'],
    ['Hannah Abbott', 'hannah.abbott@example.com', 'tier_pro', '+1-555-0105', 'Boston, MA'],
    ['Devon Miles', 'devon.miles@example.com', 'tier_starter', '+1-555-0106', 'Chicago, IL'],
    ['Fatima Al-Sayed', 'fatima.sayed@example.com', 'tier_enterprise', '+1-555-0107', 'New York, NY'],
    ['Lucas Meyer', 'lucas.meyer@example.com', 'tier_pro', '+1-555-0108', 'Denver, CO'],
    ['Kenji Sato', 'kenji.sato@example.com', 'tier_enterprise', '+1-555-0109', 'Portland, OR'],
    ['Amara Okafor', 'amara.okafor@example.com', 'tier_starter', '+1-555-0110', 'Atlanta, GA'],
    ['Gabriel Silva', 'gabriel.silva@example.com', 'tier_pro', '+1-555-0111', 'Miami, FL'],
    ['Ingrid Bergman', 'ingrid.b@example.com', 'tier_enterprise', '+1-555-0112', 'Minneapolis, MN'],
    ['Tariq Mansour', 'tariq.m@example.com', 'tier_starter', '+1-555-0113', 'Dallas, TX'],
    ['Zoe Washington', 'zoe.w@example.com', 'tier_pro', '+1-555-0114', 'Phoenix, AZ'],
    ['Viktor Petrov', 'viktor.p@example.com', 'tier_enterprise', '+1-555-0115', 'San Diego, CA'],
    ['Rachel Green', 'rachel.g@example.com', 'tier_starter', '+1-555-0116', 'Nashville, TN'],
    ['Liam Chen', 'liam.chen@example.com', 'tier_pro', '+1-555-0117', 'Philadelphia, PA'],
    ['Nadia Rossi', 'nadia.rossi@example.com', 'tier_enterprise', '+1-555-0118', 'Charlotte, NC'],
    ['Oscar Gutierrez', 'oscar.g@example.com', 'tier_starter', '+1-555-0119', 'Salt Lake City, UT'],
    ['Maya Patel', 'maya.patel@example.com', 'tier_pro', '+1-555-0120', 'Raleigh, NC'],
  ];

  const customers = customerNames.map(([name, email, tier, phone, city], idx) => ({
    name,
    email,
    tier,
    phone,
    city,
    totalSpent: Math.round((Math.random() * 5000 + 200) * 100) / 100,
    ordersCount: Math.floor(Math.random() * 15) + 1,
    status: 'active',
    is_seed: true,
    createdAt: new Date(Date.now() - (idx * 3 + 2) * 86400000),
    updatedAt: new Date(),
  }));
  await customersCol.insertMany(customers);

  // 20 Products
  const productData = [
    ['Quantum Edge Router X1', 'NET-QER-001', 'Hardware', 1299.99, 45, 4.9],
    ['CloudShield Zero-Trust Gateway', 'SEC-CSG-002', 'Security', 799.00, 120, 4.8],
    ['OpticFiber 10G SFP+ Module', 'OPT-SFP-003', 'Accessories', 89.50, 450, 4.7],
    ['Titanium Multi-Core HSM Key', 'SEC-HSM-004', 'Security', 2499.00, 18, 5.0],
    ['HyperMesh Wi-Fi 7 Enterprise Pod', 'NET-WIF-005', 'Hardware', 349.99, 85, 4.6],
    ['Encrypted NVMe SSD 2TB PCI-e 5.0', 'STR-NVM-006', 'Storage', 279.00, 160, 4.8],
    ['Managed PoE+ 48-Port Switch', 'NET-SWT-007', 'Hardware', 1099.00, 32, 4.7],
    ['Biometric YubiKey Bio FIDO2', 'SEC-BIO-008', 'Security', 85.00, 600, 4.9],
    ['Cold Storage Hardware Wallet Pro', 'SEC-WAL-009', 'Storage', 199.00, 240, 4.5],
    ['1U Rackmount Server Chassis E1', 'SRV-CHS-010', 'Hardware', 450.00, 28, 4.4],
    ['Redundant Hot-Swap Power Supply 850W', 'PWR-RPS-011', 'Accessories', 189.99, 90, 4.6],
    ['Thermal Cam Server Room Monitor', 'IOT-THC-012', 'IoT', 650.00, 40, 4.8],
    ['Precision PDU Monitored 24-Outlet', 'PWR-PDU-013', 'Hardware', 520.00, 55, 4.7],
    ['Cat8 S/FTP Shielded Cable 50m', 'CAB-C8S-014', 'Accessories', 42.00, 800, 4.9],
    ['Air-Gapped Backup Vault 16TB', 'STR-AGB-015', 'Storage', 1899.00, 14, 5.0],
    ['Smart Environmental Sensor Pod', 'IOT-ENV-016', 'IoT', 129.00, 210, 4.3],
    ['Dual-Port 25GbE PCIe NIC', 'NET-NIC-017', 'Hardware', 320.00, 75, 4.7],
    ['High-Security Server Rack Keypad Lock', 'SEC-LCK-018', 'Security', 280.00, 65, 4.6],
    ['UPS Online Double-Conversion 3000VA', 'PWR-UPS-019', 'Hardware', 1650.00, 12, 4.9],
    ['Server Console KVM Over IP 16-Port', 'NET-KVM-020', 'Hardware', 980.00, 22, 4.5],
  ];

  const products = productData.map(([name, sku, category, price, stock, rating], idx) => ({
    name,
    sku,
    category,
    price,
    currency: 'USD',
    stock,
    rating,
    status: stock > 0 ? 'in_stock' : 'out_of_stock',
    is_seed: true,
    createdAt: new Date(Date.now() - (idx * 5 + 1) * 86400000),
  }));
  await productsCol.insertMany(products);

  // 20 Orders
  const orderStatuses = ['completed', 'processing', 'completed', 'shipped', 'completed', 'pending'];
  const paymentMethods = ['credit_card', 'wire_transfer', 'stripe', 'invoice'];

  const orders = Array.from({ length: 20 }, (_, idx) => {
    const cust = customers[idx % customers.length];
    const prod = products[idx % products.length];
    const prod2 = products[(idx + 3) % products.length];
    const qty1 = Math.floor(Math.random() * 3) + 1;
    const qty2 = Math.floor(Math.random() * 2) + 1;
    const total = Math.round((prod.price * qty1 + prod2.price * qty2) * 100) / 100;

    return {
      orderNumber: `ORD-2026-${String(10400 + idx).padStart(6, '0')}`,
      customerName: cust.name,
      customerEmail: cust.email,
      items: [
        { sku: prod.sku, name: prod.name, price: prod.price, quantity: qty1 },
        { sku: prod2.sku, name: prod2.name, price: prod2.price, quantity: qty2 },
      ],
      total,
      currency: 'USD',
      status: orderStatuses[idx % orderStatuses.length],
      paymentMethod: paymentMethods[idx % paymentMethods.length],
      shippingAddress: cust.city,
      is_seed: true,
      createdAt: new Date(Date.now() - idx * 36 * 3600 * 1000),
      updatedAt: new Date(Date.now() - idx * 35 * 3600 * 1000),
    };
  });
  await ordersCol.insertMany(orders);

  // 20 Audit Logs
  const actions = [
    ['ORDER_CREATE', 'orders', 'Customer submitted checkout'],
    ['PAYMENT_CAPTURE', 'payments', 'Stripe payment intent confirmed'],
    ['INVENTORY_DECREMENT', 'products', 'Stock reduced after order commitment'],
    ['USER_LOGIN', 'sessions', 'Customer authenticated via web portal'],
    ['SHIPPING_LABEL_GEN', 'fulfillment', 'Automated label generated via carrier API'],
    ['REFUND_REQUESTED', 'refunds', 'Customer requested RMA refund ticket'],
  ];

  const auditLogs = Array.from({ length: 20 }, (_, idx) => {
    const [action, resource, note] = actions[idx % actions.length];
    const cust = customers[idx % customers.length];
    return {
      actor: cust.email,
      action,
      resource,
      resourceId: `res-${1000 + idx}`,
      ipAddress: `198.51.100.${(idx * 7) % 250 + 1}`,
      status: 'success',
      note,
      is_seed: true,
      timestamp: new Date(Date.now() - idx * 4 * 3600 * 1000),
    };
  });
  await auditLogsCol.insertMany(auditLogs);

  console.log('✔ Seeded servx_demo_shop (customers: 20, products: 20, orders: 20, audit_logs: 20)');
  await shopConn.close();
}

async function run() {
  try {
    await seedServxLocal();
    await seedDemoShop();
    console.log('🎉 MongoDB demo seed completed successfully!');
  } catch (err) {
    console.error('❌ MongoDB seed failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
