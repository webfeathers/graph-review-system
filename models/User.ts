export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // Hashed password
  createdAt: Date;
}