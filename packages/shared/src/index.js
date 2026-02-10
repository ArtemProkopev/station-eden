"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientRegisterSchema = exports.RegisterSchema = exports.LoginSchema = void 0;
const zod_1 = require("zod");
zod_1.z.setErrorMap(() => ({ message: '' }));
exports.LoginSchema = zod_1.z.object({
    login: zod_1.z.string().trim().min(1),
    password: zod_1.z.string().min(1),
});
exports.RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    username: zod_1.z.string().regex(/^[a-zA-Z0-9_]{3,20}$/),
    password: zod_1.z.string().min(8).max(72),
});
exports.ClientRegisterSchema = exports.RegisterSchema.extend({
    confirm: zod_1.z.string().min(1),
}).refine(d => d.password === d.confirm, { path: ['confirm'] });
