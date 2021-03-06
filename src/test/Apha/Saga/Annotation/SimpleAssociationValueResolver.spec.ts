
import {expect} from "chai";
import {Event} from "../../../../main/Apha/Message/Event";
import {SimpleAssociationValueResolver} from "./../../../../main/Apha/Saga/Annotation/SimpleAssociationValueResolver";
import {AssociationValue} from "../../../../main/Apha/Saga/AssociationValue";

describe("SimpleAssociationValueResolver", () => {
    let resolver;

    beforeEach(() => {
        resolver = new SimpleAssociationValueResolver();
    });

    describe("extractAssociationValues", () => {
        it("extracts all properties of event", () => {
            const event = new SimpleAssociationValueResolverSpecEvent("idValue", false, 432);
            const associationValues = resolver.extractAssociationValues(event);
            const associationValueArray = associationValues.getArrayCopy();

            expect(associationValueArray).to.have.lengthOf(1);
            expect(associationValueArray[0]).to.eql(new AssociationValue("_id", "idValue"));
        });
    });
});

class SimpleAssociationValueResolverSpecEvent extends Event {
    constructor(id: string, public isSomething: boolean, public aNumber: number) {
        super();
        this._id = id;
    }
}
