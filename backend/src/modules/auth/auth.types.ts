export interface UserRegisterDTO {
  name: string;
  email: string;
  password: string;
}

export interface UserLoginDTO {
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface UserInDB extends UserResponse {
  password: string;
}

export interface AuthTokens {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
}
