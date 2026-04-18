/**
 * firebase.adapter.ts
 * Adapter for Firebase Firestore using firebase-admin.
 * Supports listing top-level collections and fetching documents.
 */

import type { IDbAdapter, AdapterDatabase, AdapterTable, DbStats } from './base.adapter';

interface FirebaseConfig {
  serviceAccountJson?: string;
  projectId?: string;
}

export class FirebaseAdapter implements IDbAdapter {
  private readonly config: FirebaseConfig;
  private appInstance: any = null;

  constructor(config: Record<string, unknown>) {
    this.config = config as FirebaseConfig;
    if (!this.config.serviceAccountJson) {
      throw new Error('Firebase adapter requires a serviceAccountJson');
    }
  }

  private getApp(): any {
    if (this.appInstance) return this.appInstance;

    // Dynamically import firebase-admin to avoid top-level side effects
    const admin = require('firebase-admin');

    const serviceAccount = JSON.parse(this.config.serviceAccountJson!);
    const appName = `servx-db-${serviceAccount.project_id}-${Date.now()}`;

    // Check if app with different config already exists
    const existingApps: any[] = admin.apps || [];
    const existing = existingApps.find((a: any) => a?.name === appName);
    if (existing) {
      this.appInstance = existing;
      return existing;
    }

    this.appInstance = admin.initializeApp(
      {
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      },
      appName
    );
    return this.appInstance;
  }

  private getFirestore(): any {
    const admin = require('firebase-admin');
    return admin.firestore(this.getApp());
  }

  /**
   * Firebase is a single project, so we return one pseudo-database entry.
   */
  async listDatabases(): Promise<AdapterDatabase[]> {
    const serviceAccount = JSON.parse(this.config.serviceAccountJson!);
    return [{ name: serviceAccount.project_id || 'firebase-project' }];
  }

  /**
   * List top-level Firestore collections.
   */
  async listTables(dbName: string): Promise<AdapterTable[]> {
    const db = this.getFirestore();
    const collections = await db.listCollections();
    return collections.map((col: any) => ({
      name: col.id,
      type: 'collection',
    }));
  }

  /**
   * Fetch up to `limit` documents from a top-level collection.
   */
  async queryRows(dbName: string, table: string, limit = 50): Promise<unknown[]> {
    const db = this.getFirestore();
    const snapshot = await db.collection(table).limit(limit).get();
    return snapshot.docs.map((doc: any) => ({ _id: doc.id, ...doc.data() }));
  }

  async ping(): Promise<true> {
    const db = this.getFirestore();
    await db.listCollections();
    return true;
  }

  async getStats(): Promise<DbStats> {
    const serviceAccount = JSON.parse(this.config.serviceAccountJson!);
    return {
      extra: {
        projectId: serviceAccount.project_id,
        note: 'Detailed metrics available in the Firebase Console',
      },
    };
  }

  async cleanup(): Promise<void> {
    if (this.appInstance) {
      await this.appInstance.delete();
      this.appInstance = null;
    }
  }
}
