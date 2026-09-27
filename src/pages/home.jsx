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
                max-width: var(--page-max-width);
                container-type: inline-size;
                height: fit-content;

                box-sizing: border-box;
                padding: var(--page-section-gap) 0;
                margin: 0 auto;

                display: flex;
                flex-direction: column;
                gap: var(--page-section-gap);
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
