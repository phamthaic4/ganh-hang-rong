import stallsJson from '../data/stalls.json'
import type { StallDef } from './types'

/** Dữ liệu quầy duy nhất của game; cân bằng chỉ sửa JSON (AGENTS.md). */
export const STALLS: StallDef[] = stallsJson.stalls
