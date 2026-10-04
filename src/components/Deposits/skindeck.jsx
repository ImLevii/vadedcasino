import SkinDeckMarket from "../SkinDeck/market";

export default function SkinDeckDeposit(props) {
  return <SkinDeckMarket mode="deposit" onBack={props.onBack} />;
}
