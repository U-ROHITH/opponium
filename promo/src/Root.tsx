import { Composition } from "remotion";
import { DURATION, Film } from "./Film";

export const Root = () => (
  <>
    <Composition id="Promo16x9" component={Film} durationInFrames={DURATION} fps={30} width={1920} height={1080} defaultProps={{ url: "opponium.com" }} />
    <Composition id="Promo9x16" component={Film} durationInFrames={DURATION} fps={30} width={1080} height={1920} defaultProps={{ url: "opponium.com" }} />
  </>
);
