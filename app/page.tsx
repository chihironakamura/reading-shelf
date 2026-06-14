import { RestaurantFinder } from "@/components/restaurant-finder";
import { PwaRegister } from "@/components/pwa-register";

export default function Home() {
  return (
    <>
      <PwaRegister />
      <RestaurantFinder />
    </>
  );
}
