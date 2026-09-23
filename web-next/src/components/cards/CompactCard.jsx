import { memo } from "react";
import BusinessCard from "./BusinessCard.jsx";

export default memo(function CompactCard(props) {
  return <BusinessCard {...props} variant="compact" />;
});
