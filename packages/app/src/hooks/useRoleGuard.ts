import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import type { Role } from '@/types'

export function useRoleGuard(allowedRoles: Role[]) {
  const { isAuthenticated, role } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    if (role && !allowedRoles.includes(role)) {
      // Redirect to appropriate dashboard
      if (role === 'SAFAI_MITRA') {
        navigate('/safai-mitra', { replace: true })
      } else {
        navigate('/manager', { replace: true })
      }
    }
  }, [isAuthenticated, role, allowedRoles, navigate])

  return { isAuthenticated, role }
}
