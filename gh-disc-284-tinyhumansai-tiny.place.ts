// /lib/db.ts
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();

// /lib/erc20.ts
import { ethers } from 'ethers';
const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)'
];
export const usdcContract = new ethers.Contract(
  process.env.USDC_ADDRESS!,
  USDC_ABI,
  new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, new ethers.JsonRpcProvider(process.env.RPC_URL!))
);

// /pages/api/admin/resolve-stuck-bounties.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/db';
import { usdcContract } from '@/lib/erc20';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { bountyIds } = req.body;
  if (!Array.isArray(bountyIds) || bountyIds.length === 0) {
    return res.status(400).json({ error: 'Invalid bountyIds array' });
  }

  try {
    const stuckBounties = await prisma.bounties.findMany({
      where: {
        id: { in: bountyIds },
        status: 'REVIEW'
      }
    });

    if (stuckBounties.length === 0) {
      return res.status(404).json({ error: 'No stuck bounties found' });
    }

    const results = [];
    for (const bounty of stuckBounties) {
      try {
        const amount = BigInt(bounty.amount);
        const success = await usdcContract.transfer(bounty.claimerAddress, amount);
        
        if (success) {
          await prisma.bounties.update({
            where: { id: bounty.id },
            data: { 
              status: 'PAID',
              paidAt: new Date(),
              transactionHash: 'admin_override'
            }
          });
          results.push({ id: bounty.id, status: 'PAID' });
        } else {
          results.push({ id: bounty.id, status: 'FAILED', error: 'Transfer failed' });
        }
      } catch (err) {
        results.push({ id: bounty.id, status: 'FAILED', error: (err as Error).message });
      }
    }

    res.status(200).json({ message: 'Processing complete', results });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

// /pages/api/bounties/[id]/status.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') return res.status(405).end();

  const { id } = req.query;
  const { status, transactionHash } = req.body;

  try {
    const bounty = await prisma.bounties.update({
      where: { id: Number(id) },
      data: { status, transactionHash }
    });
    res.status(200).json(bounty);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}