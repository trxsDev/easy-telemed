import React from "react";

import { PieChart } from "@mui/x-charts/PieChart";
import { useDrawingArea } from "@mui/x-charts/hooks";
import { styled } from "@mui/material/styles";

function PieGauge({ data,count ,height=300,width=400}) {
  const StyledText = styled("text")(({ theme }) => ({
    fill: theme.palette.text.primary,
    textAnchor: "middle",
    dominantBaseline: "central",
    fontSize: `${height / 3.75}px`,
  }));

  const PieCenterLabel = ({ children }) => {
    const { width, height, left, top } = useDrawingArea();
    return (
      <StyledText x={left + width / 2} y={top + height / 2.5}>
        {children}
      </StyledText>
    );
  };
  return (
  <>
    {data && Array.isArray(data) && data.length > 0 ? (
        <PieChart
      style={{ height: height, width: width, marginTop: 16 }}
      series={[
        {
          startAngle: -90,
          endAngle: 90,
          paddingAngle: 5,
          innerRadius: "60%",
          outerRadius: "90%",
          data,
        },
      ]}
      slotProps={{
        legend: {
          direction: "column",
          position: { vertical: "middle", horizontal: "right" },
          padding: 0,
        },
      }}
    >
      <PieCenterLabel>{count || ""}</PieCenterLabel>
    </PieChart>):"No Data Available"
    }
    </>
    
    
  );
}

export default PieGauge;
