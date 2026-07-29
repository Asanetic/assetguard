import { MosyCard } from "../../../components/MosyCard";
import RegisterCompany from "../uiControl/RegisterCompanyui";

export function RegisterCompanyAction({ onSubmit, onClose }){

    return (
        MosyCard("", <div className="row justify-content-start col-md-12 p-0 m-0 "><RegisterCompany onSubmit={onSubmit} onClose={onClose} /></div>, false, "modal1","mosycard_medium")
    )
}