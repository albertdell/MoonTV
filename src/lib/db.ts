/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { AdminConfig } from './admin.types';
import { RedisStorage } from './redis.db';
import { Favorite, IStorage, PlayRecord, SkipConfig } from './types';

// storage type 常量: 'localstorage' | 'database'，默认 'localstorage'
const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'redis'
    | undefined) || 'localstorage';

// 简单的内存存储实现，用于开发环境
class MemoryStorage implements IStorage {
  private data = new Map<string, any>();

  async getPlayRecord(userName: string, key: string): Promise<PlayRecord | null> {
    return this.data.get(`pr:${userName}:${key}`) || null;
  }

  async setPlayRecord(userName: string, key: string, record: PlayRecord): Promise<void> {
    this.data.set(`pr:${userName}:${key}`, record);
  }

  async getAllPlayRecords(userName: string): Promise<{ [key: string]: PlayRecord }> {
    const result: { [key: string]: PlayRecord } = {};
    for (const [k, v] of this.data.entries()) {
      if (k.startsWith(`pr:${userName}:`)) {
        const key = k.replace(`pr:${userName}:`, '');
        result[key] = v;
      }
    }
    return result;
  }

  async deletePlayRecord(userName: string, key: string): Promise<void> {
    this.data.delete(`pr:${userName}:${key}`);
  }

  async getFavorite(userName: string, key: string): Promise<Favorite | null> {
    return this.data.get(`fav:${userName}:${key}`) || null;
  }

  async setFavorite(userName: string, key: string, favorite: Favorite): Promise<void> {
    this.data.set(`fav:${userName}:${key}`, favorite);
  }

  async getAllFavorites(userName: string): Promise<{ [key: string]: Favorite }> {
    const result: { [key: string]: Favorite } = {};
    for (const [k, v] of this.data.entries()) {
      if (k.startsWith(`fav:${userName}:`)) {
        const key = k.replace(`fav:${userName}:`, '');
        result[key] = v;
      }
    }
    return result;
  }

  async deleteFavorite(userName: string, key: string): Promise<void> {
    this.data.delete(`fav:${userName}:${key}`);
  }

  async registerUser(userName: string, password: string): Promise<void> {
    this.data.set(`user:${userName}`, password);
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    return this.data.get(`user:${userName}`) === password;
  }

  async checkUserExist(userName: string): Promise<boolean> {
    return this.data.has(`user:${userName}`);
  }

  async changePassword(userName: string, newPassword: string): Promise<void> {
    this.data.set(`user:${userName}`, newPassword);
  }

  async deleteUser(userName: string): Promise<void> {
    // 删除用户相关的所有数据
    const keysToDelete: string[] = [];
    for (const key of this.data.keys()) {
      if (key.includes(userName)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.data.delete(key));
  }

  async getSearchHistory(userName: string): Promise<string[]> {
    return this.data.get(`sh:${userName}`) || [];
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    const history = await this.getSearchHistory(userName);
    const newHistory = [keyword, ...history.filter(h => h !== keyword)].slice(0, 20);
    this.data.set(`sh:${userName}`, newHistory);
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    if (keyword) {
      const history = await this.getSearchHistory(userName);
      this.data.set(`sh:${userName}`, history.filter(h => h !== keyword));
    } else {
      this.data.delete(`sh:${userName}`);
    }
  }

  async getAllUsers(): Promise<string[]> {
    const users: string[] = [];
    for (const key of this.data.keys()) {
      if (key.startsWith('user:')) {
        users.push(key.replace('user:', ''));
      }
    }
    return users;
  }

  async getAdminConfig(): Promise<AdminConfig | null> {
    return this.data.get('admin:config') || null;
  }

  async setAdminConfig(config: AdminConfig): Promise<void> {
    this.data.set('admin:config', config);
  }

  async getSkipConfig(userName: string, source: string, id: string): Promise<SkipConfig | null> {
    return this.data.get(`skip:${userName}:${source}:${id}`) || null;
  }

  async setSkipConfig(userName: string, source: string, id: string, config: SkipConfig): Promise<void> {
    this.data.set(`skip:${userName}:${source}:${id}`, config);
  }

  async deleteSkipConfig(userName: string, source: string, id: string): Promise<void> {
    this.data.delete(`skip:${userName}:${source}:${id}`);
  }

  async getAllSkipConfigs(userName: string): Promise<{ [key: string]: SkipConfig }> {
    const result: { [key: string]: SkipConfig } = {};
    for (const [k, v] of this.data.entries()) {
      if (k.startsWith(`skip:${userName}:`)) {
        const key = k.replace(`skip:${userName}:`, '');
        result[key] = v;
      }
    }
    return result;
  }

  async clearAllData(): Promise<void> {
    this.data.clear();
  }
}

// 创建存储实例
function createStorage(): IStorage {
  switch (STORAGE_TYPE) {
    case 'redis':
      return new RedisStorage();
    case 'localstorage':
    default:
      // 返回内存实现，保证本地开发可用
      return new MemoryStorage();
  }
}

// 单例存储实例
let storageInstance: IStorage | null = null;

export function getStorage(): IStorage {
  if (!storageInstance) {
    storageInstance = createStorage();
  }
  return storageInstance;
}

// 工具函数：生成存储key
export function generateStorageKey(source: string, id: string): string {
  return `${source}+${id}`;
}

// 导出便捷方法
export class DbManager {
  private storage: IStorage;

  constructor() {
    this.storage = getStorage();
  }

  // 播放记录相关方法
  async getPlayRecord(
    userName: string,
    source: string,
    id: string
  ): Promise<PlayRecord | null> {
    const key = generateStorageKey(source, id);
    return this.storage.getPlayRecord(userName, key);
  }

  async savePlayRecord(
    userName: string,
    source: string,
    id: string,
    record: PlayRecord
  ): Promise<void> {
    const key = generateStorageKey(source, id);
    await this.storage.setPlayRecord(userName, key, record);
  }

  async getAllPlayRecords(userName: string): Promise<{
    [key: string]: PlayRecord;
  }> {
    return this.storage.getAllPlayRecords(userName);
  }

  async deletePlayRecord(
    userName: string,
    source: string,
    id: string
  ): Promise<void> {
    const key = generateStorageKey(source, id);
    await this.storage.deletePlayRecord(userName, key);
  }

  // 收藏相关方法
  async getFavorite(
    userName: string,
    source: string,
    id: string
  ): Promise<Favorite | null> {
    const key = generateStorageKey(source, id);
    return this.storage.getFavorite(userName, key);
  }

  async saveFavorite(
    userName: string,
    source: string,
    id: string,
    favorite: Favorite
  ): Promise<void> {
    const key = generateStorageKey(source, id);
    await this.storage.setFavorite(userName, key, favorite);
  }

  async getAllFavorites(
    userName: string
  ): Promise<{ [key: string]: Favorite }> {
    return this.storage.getAllFavorites(userName);
  }

  async deleteFavorite(
    userName: string,
    source: string,
    id: string
  ): Promise<void> {
    const key = generateStorageKey(source, id);
    await this.storage.deleteFavorite(userName, key);
  }

  async isFavorited(
    userName: string,
    source: string,
    id: string
  ): Promise<boolean> {
    const favorite = await this.getFavorite(userName, source, id);
    return favorite !== null;
  }

  async toggleFavorite(
    userName: string,
    source: string,
    id: string,
    favoriteData?: Favorite
  ): Promise<boolean> {
    const isFav = await this.isFavorited(userName, source, id);

    if (isFav) {
      await this.deleteFavorite(userName, source, id);
      return false;
    }

    if (favoriteData) {
      await this.saveFavorite(userName, source, id, favoriteData);
      return true;
    }

    throw new Error('Favorite data is required when adding to favorites');
  }

  // ---------- 用户相关 ----------
  async registerUser(userName: string, password: string): Promise<void> {
    await this.storage.registerUser(userName, password);
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    return this.storage.verifyUser(userName, password);
  }

  // 检查用户是否已存在
  async checkUserExist(userName: string): Promise<boolean> {
    return this.storage.checkUserExist(userName);
  }

  // ---------- 搜索历史 ----------
  async getSearchHistory(userName: string): Promise<string[]> {
    return this.storage.getSearchHistory(userName);
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    await this.storage.addSearchHistory(userName, keyword);
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    await this.storage.deleteSearchHistory(userName, keyword);
  }

  // 获取全部用户名
  async getAllUsers(): Promise<string[]> {
    if (typeof (this.storage as any).getAllUsers === 'function') {
      return (this.storage as any).getAllUsers();
    }
    return [];
  }

  // ---------- 管理员配置 ----------
  async getAdminConfig(): Promise<AdminConfig | null> {
    if (typeof (this.storage as any).getAdminConfig === 'function') {
      return (this.storage as any).getAdminConfig();
    }
    return null;
  }

  async saveAdminConfig(config: AdminConfig): Promise<void> {
    if (typeof (this.storage as any).setAdminConfig === 'function') {
      await (this.storage as any).setAdminConfig(config);
    }
  }
}

// 导出默认实例
export const db = new DbManager();
