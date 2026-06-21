export const isValidEmail = (email: string): boolean => {
  // Simple regex for basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}