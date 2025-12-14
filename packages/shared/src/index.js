"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientRegisterSchema = exports.RegisterSchema = exports.LoginSchema = void 0;
// @station-eden/shared - дополняем существующий файл
const zod_1 = require("zod");
// ==============================================================================
// 0. ZOD GLOBAL ERROR MAP (убираем дефолтные сообщения валидации)
// ==============================================================================
zod_1.z.setErrorMap(() => {
    // Возвращаем пустую строку — UI получает факт ошибки, но без текста
    return { message: '' };
});
// ==============================================================================
// 1. AUTH & USERS (Авторизация и Пользователи)
// ==============================================================================
/**
 * Схема для Входа (Login)
 * Минимальная валидация, сообщения нам не нужны — ошибки под полями не показываем.
 */
exports.LoginSchema = zod_1.z.object({
    login: zod_1.z.string().trim().min(1),
    password: zod_1.z.string().min(1),
});
/**
 * Схема для Регистрации (Register)
 * Перенесли валидацию из API (class-validator) в Zod.
 * Сообщения валидации глобально глушатся через setErrorMap.
 */
exports.RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    username: zod_1.z.string().regex(/^[a-zA-Z0-9_]{3,20}$/),
    password: zod_1.z.string().min(8).max(72),
});
// ==============================================================================
// 7. CLIENT-SPECIFIC TYPES (Дополнения для клиента)
// ==============================================================================
/**
 * Расширенная схема регистрации для клиента (добавляем confirm password)
 * Сообщения валидации глобально пустые, UI сам показывает подсказки.
 */
exports.ClientRegisterSchema = exports.RegisterSchema.extend({
    confirm: zod_1.z.string().min(1),
}).refine(data => data.password === data.confirm, {
    path: ['confirm'],
});
