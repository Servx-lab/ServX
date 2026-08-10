# Auto Medic 🩺

**Route:** `/auto-medic`  
**File:** `apps/web/src/pages/AutoMedic.tsx`

Auto-Medic is an intelligent, automated remediation system designed to diagnose and provide solutions for infrastructure and application errors. By leveraging a high-efficiency caching layer, it minimizes the reliance on LLM (Large Language Model) calls, ensuring both speed and cost-effectiveness.

---

## 🛠 How It Works

The Auto-Medic engine follows a strictly optimized workflow to handle incoming errors:

### 1. Error Detection & Hashing
When an error occurs within the operations pipeline or application lifecycle, a unique **signature (hash)** is generated based on the error message and context.

### 2. Cache Lookup
Before invoking any AI models, Auto-Medic queries the high-speed Redis cache layer via the backend:
- **Location:** Managed by the isolated `Automedic-Pipeline` microservice in Redis.
- **Logic:** If the generated hash exists in the cache, the system immediately retrieves the pre-stored **Diagnosis** and **Suggested Fix**.

### 3. AI-Powered Remediation (Fallback)
If the error is **new** (hash not found):
1. The error is sent to the isolated Python remediation model.
2. The UI subscribes to a real-time SSE stream (`/api/automedic/stream`) to watch the model's progress.
3. **Storage:** The finalized result is saved back into Redis with its unique signature.
4. Future occurrences of the same error will now hit the cache instantly.

---

## 💎 Key Benefits

### 🪙 Token Optimization
LLM tokens are expensive and limited. By caching solutions for recurring errors (like MongoDB connection timeouts or JWT expirations), we reduce the token burn rate significantly.

### ⚡ Instant Response
Fetching from a JSON file takes milliseconds, whereas an AI generation can take several seconds. This allows for near-instant automated remediation for known issues.

### 📈 Growing Intelligence
The more errors the system encounters, the more robust the `errorCache.json` becomes, effectively building a localized knowledge base for the specific infrastructure.

---

## 📂 Cache Structure

The cache is stored in Redis using a key-value format where the key is the SHA-256 (or similar) hash of the error:

```json
{
  "hash_signature": {
    "originalError": "MongooseServerSelectionError: ...",
    "diagnosis": "MongoDB Connection Timeout.",
    "suggestedFix": "// Check your IP Whitelist...",
    "severity": "MEDIUM",
    "cached": true,
    "timestamp": "2026-05-10T12:00:00.000Z"
  }
}
```

---

## 🔗 Related Components

- **Operations Pipeline:** See [operations.md](./operations.md) for how Auto-Medic integrates with live deployment monitoring.
- **Frontend UI:** `apps/web/src/features/operations/AutoMedicPipeline.tsx` handles the visualization of the diagnosis process.
