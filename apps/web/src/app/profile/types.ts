export interface ProfileData {
  status: 'loading' | 'error' | 'ok' | 'unauth';
  userId?: string;
  email?: string;
  username?: string | null;
  message?: string;
}

export interface ProfileIconsStatus {
  planet: boolean;
  polygon: boolean;
  copy: boolean;
}

export interface ProfileAssets {
  avatar: string;
  frame: string;
}

export interface ProfileModalState {
  isOpen: boolean;
}