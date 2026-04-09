import type { User as UserEntity } from '@servx/types';
import type { Model } from 'mongoose';

const UserModel = require('../../../models/User') as Model<UserEntity>;

export type { UserEntity };
export default UserModel;
