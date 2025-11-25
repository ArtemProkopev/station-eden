// apps/web/src/utils/validation.ts
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/

export const isLoginValid = (login: string) => 
  emailRegex.test(login) || usernameRegex.test(login)