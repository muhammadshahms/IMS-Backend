import { Spin } from "antd";
import { BiLoader } from "react-icons/bi";

const antIcon = (
    <BiLoader
        style={{
            fontSize: 38,
            color: "#9ca3af",
            animation: "spin 3s linear infinite"
        }}
    />
);

const inlineStyle = `
  @keyframes spin { 
    100% { transform: rotate(360deg); } 
  }`;
if (typeof document !== "undefined" && !document.getElementById("spin-keyframes")) {
    const style = document.createElement("style");
    style.id = "spin-keyframes";
    style.innerHTML = inlineStyle;
    document.head.appendChild(style);
}

const Loader = () => {
    return (
        <div className="flex justify-center items-center h-40">
            <Spin indicator={antIcon} />
        </div>
    )
}

export default Loader
