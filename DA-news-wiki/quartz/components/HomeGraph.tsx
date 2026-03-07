import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/graph.inline"
import style from "./styles/home-graph.scss"
import { classNames } from "../util/lang"

export default (() => {
    const HomeGraph: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
        const globalGraphCfg = {
            drag: true,
            zoom: true,
            depth: -1,
            scale: 1.1,
            repelForce: 0.5,
            centerForce: 0.3,
            linkDistance: 50,
            fontSize: 0.6,
            opacityScale: 1,
            showTags: true,
            removeTags: [],
            focusOnHover: true,
            enableRadial: false,
            excludeNodes: ["/"],
        }

        return (
            <div class={classNames(displayClass, "home-graph")}>
                <div class="graph-container" data-cfg={JSON.stringify(globalGraphCfg)}></div>
            </div>
        )
    }

    HomeGraph.css = style
    HomeGraph.afterDOMLoaded = script

    return HomeGraph
}) satisfies QuartzComponentConstructor
