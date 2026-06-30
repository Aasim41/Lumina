import { Utensils, Film, ShoppingBag, Car, Zap, Home, HeartPulse, PiggyBank, CircleEllipsis } from 'lucide-react';

export const CategoryIcon = ({ category, className }: { category: string, className?: string }) => {
  switch (category) {
    case "Food & Dining": return <Utensils className={className} />;
    case "Entertainment": return <Film className={className} />;
    case "Shopping": return <ShoppingBag className={className} />;
    case "Transport": return <Car className={className} />;
    case "Utilities": return <Zap className={className} />;
    case "Housing": return <Home className={className} />;
    case "Health & Fitness": return <HeartPulse className={className} />;
    case "Savings": return <PiggyBank className={className} />;
    default: return <CircleEllipsis className={className} />;
  }
};
