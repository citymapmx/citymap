import { memo } from "react";
import BusinessCard from "./BusinessCard.jsx";

export default memo(function DestacadoCard(props) {
  return <BusinessCard {...props} variant="destacado" />;
});
