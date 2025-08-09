import * as fs from 'fs';
import * as path from 'path';

interface CachedHtmlEntry {
  content: string;
  timestamp: Date;
  url: string;
}

export class HtmlCacheManager {
  private cacheDir: string;
  private readonly CACHE_DURATION_HOURS = 24;

  constructor() {
    this.cacheDir = path.join(process.cwd(), '.cache', 'html');
    this.ensureCacheDirectory();
  }

  private ensureCacheDirectory(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getCacheFilePath(endpointCode: string): string {
    return path.join(this.cacheDir, `${endpointCode}.json`);
  }

  private isCacheValid(timestamp: Date): boolean {
    const now = new Date();
    const cacheAge = now.getTime() - timestamp.getTime();
    const maxAge = this.CACHE_DURATION_HOURS * 60 * 60 * 1000; // 24 hours in milliseconds
    return cacheAge < maxAge;
  }

  async getCachedHtml(endpointCode: string): Promise<string | null> {
    try {
      const cacheFile = this.getCacheFilePath(endpointCode);
      
      if (!fs.existsSync(cacheFile)) {
        return null;
      }

      const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8')) as CachedHtmlEntry;
      
      if (!this.isCacheValid(new Date(cacheData.timestamp))) {
        // Cache expired, remove the file
        fs.unlinkSync(cacheFile);
        return null;
      }

      console.log(`Cache hit for endpoint: ${endpointCode}`);
      return cacheData.content;
    } catch (error) {
      console.warn(`Error reading cache for ${endpointCode}:`, error);
      return null;
    }
  }

  async cacheHtml(endpointCode: string, url: string, content: string): Promise<void> {
    try {
      const cacheFile = this.getCacheFilePath(endpointCode);
      const cacheEntry: CachedHtmlEntry = {
        content,
        timestamp: new Date(),
        url
      };

      fs.writeFileSync(cacheFile, JSON.stringify(cacheEntry, null, 2));
      console.log(`Cached HTML for endpoint: ${endpointCode}`);
    } catch (error) {
      console.warn(`Error caching HTML for ${endpointCode}:`, error);
    }
  }

  async clearCache(): Promise<void> {
    try {
      if (fs.existsSync(this.cacheDir)) {
        const files = fs.readdirSync(this.cacheDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.cacheDir, file));
        }
        console.log('HTML cache cleared');
      }
    } catch (error) {
      console.warn('Error clearing cache:', error);
    }
  }

  getCacheStatus(): { hasCache: boolean; cacheSize: number; cacheDir: string } {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        return { hasCache: false, cacheSize: 0, cacheDir: this.cacheDir };
      }

      const files = fs.readdirSync(this.cacheDir);
      return {
        hasCache: files.length > 0,
        cacheSize: files.length,
        cacheDir: this.cacheDir
      };
    } catch (error) {
      return { hasCache: false, cacheSize: 0, cacheDir: this.cacheDir };
    }
  }
}
