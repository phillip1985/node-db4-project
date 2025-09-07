router.get('/check-name', async (req, res) => {
  const { name } = req.query;
  if (typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ errors: ['name query parameter is required'] });
  }
  // ...rest of your logic
});