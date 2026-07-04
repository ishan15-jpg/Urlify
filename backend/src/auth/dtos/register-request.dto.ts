/**
 * DTO for the POST /auth/register request body.
 * After validation middleware runs, req.body is guaranteed to match this shape.
 */
export interface RegisterRequestDto {
  name: string;
  email: string;
  password: string;
}
