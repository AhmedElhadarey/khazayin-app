import { Category, Resource } from '../types';
import { MOCK_CATEGORIES, MOCK_RESOURCES } from '../data/mockData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const USE_MOCK_DATA = true;

class ApiService {
  async getCategories(): Promise<Category[]> {
    if (USE_MOCK_DATA) {
      await delay(500);
      return MOCK_CATEGORIES;
    }
    throw new Error('Live API not implemented yet');
  }

  async getRootCategories(): Promise<Category[]> {
    const cats = await this.getCategories();
    return cats.filter(c => !c.parentId);
  }

  async getSubCategories(parentId: string): Promise<Category[]> {
    const cats = await this.getCategories();
    return cats.filter(c => c.parentId === parentId);
  }

  async getResources(categoryId?: string, query?: string): Promise<Resource[]> {
    if (USE_MOCK_DATA) {
      await delay(500);
      let results = MOCK_RESOURCES;

      if (categoryId) {
        results = results.filter(r => r.categoryId === categoryId);
      }
      if (query) {
        results = results.filter(r => r.title.includes(query) || r.author.includes(query));
      }

      return results;
    }
    throw new Error('Live API not implemented yet');
  }

  async getResourceById(id: string): Promise<Resource | null> {
    if (USE_MOCK_DATA) {
      await delay(300);
      return MOCK_RESOURCES.find(r => r.id === id) || null;
    }
    throw new Error('Live API not implemented yet');
  }

  async getFeaturedResources(): Promise<Resource[]> {
    if (USE_MOCK_DATA) {
      await delay(500);
      return MOCK_RESOURCES.slice(0, 4);
    }
    throw new Error('Live API not implemented');
  }

  async getAudioResources(): Promise<Resource[]> {
    const resources = await this.getResources();
    return resources.filter(r => r.fileType === 'audio');
  }
}

export const apiService = new ApiService();
