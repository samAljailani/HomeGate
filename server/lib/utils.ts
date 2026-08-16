export const isValidEmail = (email: string): boolean => {
  // Simple regex for basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export const EmptyStringToUndefined = ({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;

    const email = value.trim().toLowerCase();
    return email === '' ? undefined : email;
};