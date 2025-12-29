import jwt from "jsonwebtoken";

const getSecret = (): string => {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT secret. Set NEXTAUTH_SECRET or JWT_SECRET in env.");
  }
  return secret;
};

export function signToken(payload: Record<string, any>, options?: jwt.SignOptions) {
  return jwt.sign(payload, getSecret(), { ...(options || { expiresIn: "7d" }) });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, getSecret()) as Record<string, any>;
  } catch (err) {
    return null;
  }
}


