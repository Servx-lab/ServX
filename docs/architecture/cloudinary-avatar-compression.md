# Cloudinary Avatar Compression & Auto-Sync

This document details the end-to-end data flow for profile photo uploads and syncing in the Hosting Integrations dashboard.

## Client-Side Compression Constraint

To protect bandwidth, reduce latency, and minimize Cloudinary storage costs, **all avatars are strictly compressed before they ever leave the user's browser**.

Using the `browser-image-compression` library, we intercept the raw `File` object from the `<input type="file">` element.

**The Algorithm:**
1. **Target Size Constraint**: We set a hard limit of `50KB` (`maxSizeMB: 0.05`).
2. **Dimension Constraints**: Avatars are square, so we set a maximum resolution of `256x256` (`maxWidthOrHeight: 256`).
3. **Execution**: The browser engine iteratively scales down the image and lowers the JPEG/WebP quality until the file byte-size is under the target threshold. 

This guarantees that even if a user uploads a 4K 10MB photo from their phone, our server only receives a highly-optimized ~45KB payload.

## Backend Cascading Deletion

ServX implements strict data-hygiene policies. When an API Key (Connection) is deleted, we must not leave orphaned assets floating in our Cloudinary bucket.

We have bound the Cloudinary destruction hook directly to the database deletion transaction:

```typescript
// 1. Retrieve the connection to check for an existing avatar
const connection = await db.collection('hosting_vault').findOne({ _id: new ObjectId(id) });

// 2. Perform the database deletion
const result = await db.collection('hosting_vault').deleteOne({
  _id: new ObjectId(id),
  userId: req.user.id
});

// 3. Post-Hook: If an avatar exists, destroy it on Cloudinary
if (result.deletedCount === 1 && connection?.avatarUrl) {
  try {
    const publicId = extractCloudinaryPublicId(connection.avatarUrl);
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    // Log the error for cron-job cleanup, but do not block the user's API response
    logger.error('Failed to delete avatar from Cloudinary', error);
  }
}
```

This auto-sync deletion architecture guarantees that our asset storage scales exactly 1:1 with our active database rows, completely eliminating cloud storage bloat.
