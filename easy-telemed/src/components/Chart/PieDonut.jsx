import React from "react";
import { PieChart } from "@mui/x-charts/PieChart";

function PieDonut({data,width=200,height=200}) {
    console.log("PieDonut data:", data);
  const settings = {
    margin: { right: 5 },
    width: width,
    height: height,
    hideLegend: true,
  };
  return (
    <div>
      {data && Array.isArray(data) && data.length > 0 ? (
        <PieChart
          series={[
            { innerRadius: width / 4, outerRadius: width / 2, data, arcLabel: "value" },
          ]}
          {...settings}
        />) : "No Data Available"
      }
    </div>
  );
}

export default PieDonut;
