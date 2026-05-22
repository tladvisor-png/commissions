import { DealStatus } from '@/types/commission'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'

interface StatusBadgeProps {
  status: DealStatus
  size?: 'sm' | 'default'
}

export function StatusBadge({ status, size = 'default' }: StatusBadgeProps) {
  if (status === 'INSTANCE') {
    return (
      <Badge variant="danger" className="gap-1 font-semibold">
        <AlertTriangle className="h-3 w-3" />
        Instance
      </Badge>
    )
  }
  if (status === 'CONTRAT_OK') {
    return (
      <Badge variant="success" className="gap-1 font-semibold">
        <CheckCircle className="h-3 w-3" />
        Contrat OK
      </Badge>
    )
  }
  return (
    <Badge variant="warning" className="gap-1 font-semibold">
      <Clock className="h-3 w-3" />
      À valider
    </Badge>
  )
}
