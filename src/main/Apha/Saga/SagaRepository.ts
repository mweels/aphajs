
import {SagaStorage} from "./Storage/SagaStorage";
import {SagaSerializer} from "./SagaSerializer";
import {Saga} from "./Saga";
import {AssociationValue} from "./AssociationValue";
import {AssociationValueDescriptor} from "./Storage/AssociationValueDescriptor";
import {ClassNameInflector} from "../Inflection/ClassNameInflector";

export class SagaRepository<T extends Saga> {
    constructor(private storage: SagaStorage, private serializer: SagaSerializer<T>) {}

    public add(saga: T): void {
        if (!saga.isActive()) {
            return;
        }

        this.storage.insert(
            ClassNameInflector.classOf(saga),
            saga.getId(),
            AssociationValueDescriptor.fromValues(saga.getAssociationValues()),
            this.serializer.serialize(saga)
        );
    }

    public commit(saga: T): void {
        if (!saga.isActive()) {
            this.storage.remove(saga.getId());
            return;
        }

        this.storage.update(
            ClassNameInflector.classOf(saga),
            saga.getId(),
            AssociationValueDescriptor.fromValues(saga.getAssociationValues()),
            this.serializer.serialize(saga)
        );
    }

    public find(sagaType: {new(...args: any[]): T}, associationValue: AssociationValue): string[] {
        let sagaClass = ClassNameInflector.className(sagaType);
        return this.storage.find(sagaClass, AssociationValueDescriptor.fromValue(associationValue));
    }

    public load(id: string, sagaType: {new(...args: any[]): T}): T {
        let sagaData = this.storage.findById(id);

        if (!sagaData) {
            return null;
        }

        return this.serializer.deserialize(sagaData, sagaType);
    }
}
