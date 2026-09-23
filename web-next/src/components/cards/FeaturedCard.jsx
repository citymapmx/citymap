import { memo } from "react";
import BusinessCard from "./BusinessCard.jsx";

export default memo(function FeaturedCard(props) {
  return <BusinessCard {...props} variant="featured" />;
});
