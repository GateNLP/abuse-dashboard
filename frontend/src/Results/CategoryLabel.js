const CategoryLabel = ({ title, color }) => {

    return (
        <span style={{ display: "inline-block", fontSize: "14px", fontWeight: "600", paddingTop: "12px", paddingBottom: "12px" }} >
            <span style={{ color: color, paddingRight: "1ex" }}>&#11044;</span> {title}
        </span>
    )
}

export default CategoryLabel;