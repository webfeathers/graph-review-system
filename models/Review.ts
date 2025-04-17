export interface Review {
  id: string;
  title: string;
  description: string;
  graphImageUrl?: string;
  status: 'Submitted' | 'In Review' | 'Needs Work' | 'Approved';
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}