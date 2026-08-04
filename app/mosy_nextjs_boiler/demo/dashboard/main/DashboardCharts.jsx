"use client";
import ElforgeChart from "../../../components/ElforgeChart";
import { MosyTitleTag } from '../../UiControl/componentControl';

export default function DashboardCharts({ chartData }) {
  return (
    <>
      {chartData?.map((chart, i) => (
        <div  className={`row justify-content-center m-0 p-2 mt-3 bg-white  ${chart.containerClass}`} key={i}>
          <div className="col-md-12 p-2 m-lg-3 border medium_curve">
            <MosyTitleTag title={chart.title} />
            <ElforgeChart
              chartType={chart.chartType}
              dataKey={chart.dataKey}
              data={chart.data}
              series={chart.series}
              height={chart.height}
            />
          </div>
      </div>
      ))}
    </>
  );
}
