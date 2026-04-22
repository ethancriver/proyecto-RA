import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    if (!prisma) {
      return res.status(200).json({ save: null, message: 'No database configured' });
    }

    const save = await prisma.saveState.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ save });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error interno al cargar' });
  }
}
