import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { state, id } = req.body;
    if (!state) {
      return res.status(400).json({ error: 'Falta el estado de guardado' });
    }

    if (!prisma) {
      return res.status(200).json({ id: null, savedAt: new Date(), message: 'No database configured' });
    }

    let save;
    if (typeof id === 'number') {
      save = await prisma.saveState.update({
        where: { id },
        data: { state }
      });
    } else {
      save = await prisma.saveState.create({
        data: { state }
      });
    }

    return res.status(200).json({ id: save.id, savedAt: save.createdAt });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error interno al guardar' });
  }
}
