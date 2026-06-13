import Bets from "../components/Home/bets";
import Carousel from "../components/Home/carousel";
import FeatureGrid from "../components/Home/featuregrid";

function Home(props) {

    return (
        <>
            <div class='home-container fadein'>

                <Carousel/>

                <FeatureGrid/>

                <Bets user={props.user}/>
            </div>

            <style jsx>{`
              .home-container {
                width: 100%;
                max-width: 1175px;
                height: fit-content;

                box-sizing: border-box;
                padding: 24px 0;
                margin: 0 auto;

                display: flex;
                flex-direction: column;
                gap: 24px;
              }

              @media only screen and (max-width: 1000px) {
                .home-container {
                  padding-bottom: 90px;
                }
              }
            `}</style>
        </>
    );
}

export default Home;
