import type { Model, Document } from 'mongoose';

const AdminModel = require('../../../models/Admin') as Model<Document>;
const AccessControlModel = require('../../../models/AccessControl') as Model<Document>;
const UserModel = require('../../../models/User') as Model<Document>;

export const Admin = AdminModel;
export const AccessControl = AccessControlModel;
export const User = UserModel;
