export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId: string | null;
  coverImage?: string;
  childrenCount?: number;
  icon?: string;
  count?: number;
  type?: string;
}

export interface Resource {
  id: string;
  title: string;
  categoryId: string;
  author: string;
  description?: string;
  fileUrl: string;
  fileType: 'pdf' | 'audio' | 'image' | 'folder' | 'unknown';
  sizeBytes?: number;
  durationMinutes?: number;
  thumbnailUrl?: string;
  createdAt?: string;
  progress?: number; // 0-100 reading/listening progress
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  linkType: 'category' | 'resource' | 'external';
  linkId?: string;
  backgroundColor?: string;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  subscriberCount?: number;
  imageUrl?: string;
}

export interface HomeSection {
  id: string;
  title: string;
  type: 'banner' | 'resources' | 'categories';
  items: Resource[] | Category[];
}

export interface Scholar {
  id: string;
  name: string;
  title: string; // e.g. "الشيخ"
}

export interface BookItem {
  id: string;
  title: string;
  categoryId?: string;
}

export interface DawahDesign {
  id: string;
  title: string;
}

export interface QuickAccessItem {
  id: string;
  label: string;
  icon: string;
}
