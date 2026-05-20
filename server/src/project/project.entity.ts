export interface Project {
  id: string;
  title: string;
  status: 'IDEA';
  config: {
    style?: string;
    platform?: string;
    genre?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
