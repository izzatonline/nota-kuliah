import { createContext, useContext } from 'react'

type PlayerCtx = { time: number; playing: boolean; seek: (t: number) => void }
export const PlayerContext = createContext<PlayerCtx>({ time: 0, playing: false, seek: () => {} })
export const usePlayer = () => useContext(PlayerContext)
