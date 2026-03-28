// Verify admin key from Authorization header
export function verifyAdmin(request: Request): boolean {
  const auth = request.headers.get('authorization');
  const key = auth?.replace('Bearer ', '');
  return key === process.env.ADMIN_KEY;
}

export function unauthorizedResponse(): Response {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
