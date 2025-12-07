const { z } = require('zod');

const registerSchema = z.object({
  bq_id: z.string().min(5, 'BQ ID must be at least 5 characters'),
  name: z.string().min(3, 'Name is too short'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().regex(/^92\d{10}$/, 'Phone must start with 92 and contain 12 digits'),
  CNIC: z.string().regex(/^\d{5}-\d{7}-\d$/, 'CNIC must be in xxxxx-xxxxxxx-x format'),
  course: z.string().min(1, 'Course is required'),
  gender: z.string().min(1, 'Gender is required'),
  shift: z.string().min(1, 'Shift is required'),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions"
  }),
});

const updateRegisterSchema = registerSchema.omit({ password: true, termsAccepted: true });


// const updateRegisterSchema = z.object({
//   bq_id: z.string().min(5, 'BQ ID must be at least 5 characters'),
//   name: z.string().min(3, 'Name is too short'),
//   email: z.string().email('Invalid email'),
//   phone: z.string().min(11, 'Phone number must be at least 11 characters'),
//   CNIC: z.string().min(13, 'CNIC must be at least 13 characters'),
//   course: z.string().min(1, 'Course is required'),
//   gender: z.string().min(1, 'Gender is required'),
//   shift: z.string().min(1, 'Shift is required'),
// })

module.exports = { registerSchema, updateRegisterSchema };