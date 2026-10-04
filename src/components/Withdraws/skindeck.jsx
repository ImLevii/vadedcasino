import SkinDeckMarket from "../SkinDeck/market";

export default function SkinDeckWithdraw(props) {
  return <SkinDeckMarket mode="withdrawal" onBack={props.onBack} />;
}
