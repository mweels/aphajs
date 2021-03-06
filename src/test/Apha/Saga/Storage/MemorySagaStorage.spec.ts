
import {expect} from "chai";
import {MemorySagaStorage} from "../../../../main/Apha/Saga/Storage/MemorySagaStorage";
import {Saga} from "../../../../main/Apha/Saga/Saga";
import {Event} from "../../../../main/Apha/Message/Event";
import {AssociationValues} from "../../../../main/Apha/Saga/AssociationValues";
import {AssociationValue} from "../../../../main/Apha/Saga/AssociationValue";
import {ClassNameInflector} from "../../../../main/Apha/Inflection/ClassNameInflector";
import {AssociationValueDescriptor} from "../../../../main/Apha/Saga/Storage/AssociationValueDescriptor";
import {SagaSerializer} from "../../../../main/Apha/Saga/SagaSerializer";
import {JsonSerializer} from "../../../../main/Apha/Serialization/JsonSerializer";
import {GenericSagaFactory} from "../../../../main/Apha/Saga/GenericSagaFactory";

describe("MemorySagaStorage", () => {
    let storage;
    let serializer;

    before(() => {
        const factory = new GenericSagaFactory<MemorySagaStorageSpecSaga>();
        serializer = new SagaSerializer<MemorySagaStorageSpecSaga>(new JsonSerializer(), factory);
    });

    beforeEach(() => {
        storage = new MemorySagaStorage();
    });

    describe("insert", () => {
        it("inserts a saga and its associated values into storage", () => {
            const sagaId = "id";
            const associationValues = new AssociationValues([
                new AssociationValue("foo", "bar"),
                new AssociationValue("baz", "boo")
            ]);

            const saga = new MemorySagaStorageSpecSaga(sagaId, associationValues);
            const serializedSaga = serializer.serialize(saga);

            storage.insert(
                ClassNameInflector.classOf(saga),
                sagaId,
                AssociationValueDescriptor.fromValues(associationValues),
                serializedSaga
            );

            const sagaData = storage.findById(sagaId);
            expect(sagaData).to.equal(serializedSaga);
        });

        it("associates a saga only once for a associated value", () => {
            const sagaId = "id";
            const associationValues = new AssociationValues([
                new AssociationValue("foo", "bar"),
                new AssociationValue("baz", "boo")
            ]);

            const saga = new MemorySagaStorageSpecSaga(sagaId, associationValues);
            const serializedSaga = serializer.serialize(saga);
            const sagaClass = ClassNameInflector.classOf(saga);

            storage.insert(
                sagaClass,
                sagaId,
                AssociationValueDescriptor.fromValues(associationValues),
                serializedSaga
            );

            storage.insert(
                sagaClass,
                sagaId,
                AssociationValueDescriptor.fromValues(associationValues),
                serializedSaga
            );

            const foundSagas = storage.find(sagaClass, AssociationValueDescriptor.fromValues(associationValues));
            expect(foundSagas).to.have.lengthOf(1);
        });
    });

    describe("findById", () => {
        it("finds a stored saga by ID", () => {
            const saga = new MemorySagaStorageSpecSaga("id", new AssociationValues());
            const serializedSaga = serializer.serialize(saga);

            storage.insert(
                ClassNameInflector.classOf(saga),
                saga.getId(),
                AssociationValueDescriptor.fromValues(saga.getAssociationValues()),
                serializedSaga
            );

            const sagaData = storage.findById(saga.getId());
            expect(sagaData).to.equal(serializedSaga);
        });

        it("returns NULL if no saga with given ID was found", () => {
            expect(storage.findById("id")).to.be.null;
        });
    });

    describe("find", () => {
        it("retrieves sagas by type and associated values", () => {
            // matching saga
            const saga1 = new MemorySagaStorageSpecSaga("id1", new AssociationValues([
                new AssociationValue("foo", "bar")
            ]));

            // non-matching: same associationValue, but other type, at insert()
            const saga2 = new MemorySagaStorageSpecSaga("id2", new AssociationValues([
                new AssociationValue("foo", "bar")
            ]));

            // non-matching: other associationValue (same key)
            const saga3 = new MemorySagaStorageSpecSaga("id3", new AssociationValues([
                new AssociationValue("foo", "baz")
            ]));

            storage.insert(
                "SomeSaga",
                saga1.getId(),
                AssociationValueDescriptor.fromValues(saga1.getAssociationValues()),
                serializer.serialize(saga1)
            );

            storage.insert(
                "SomeOtherSaga",
                saga2.getId(),
                AssociationValueDescriptor.fromValues(saga2.getAssociationValues()),
                serializer.serialize(saga2)
            );

            storage.insert(
                "SomeSaga",
                saga3.getId(),
                AssociationValueDescriptor.fromValues(saga3.getAssociationValues()),
                serializer.serialize(saga3)
            );

            const foundSagas = storage.find(
                "SomeSaga",
                AssociationValueDescriptor.fromValues(saga1.getAssociationValues())
            );

            expect(foundSagas).to.have.lengthOf(1);
            expect(foundSagas[0]).to.equal(saga1.getId());
        });

        it("returns empty result if no sagas can be found with given type and associated values", () => {
            const foundSagas = storage.find("SomeSaga", AssociationValueDescriptor.fromValues(new AssociationValues([
                new AssociationValue("foo", "bar")
            ])));

            expect(foundSagas).to.have.lengthOf(0);
            expect(foundSagas).to.eql([]);
        });
    });

    describe("remove", () => {
        it("removes a previously stored saga", () => {
            // to-be-removed saga
            const saga1 = new MemorySagaStorageSpecSaga("id1", new AssociationValues([
                new AssociationValue("foo", "bar")
            ]));

            // like-saga, different associations
            const saga2 = new MemorySagaStorageSpecSaga("id2", new AssociationValues([
                new AssociationValue("foo", "baz")
            ]));

            storage.insert(
                ClassNameInflector.classOf(saga1),
                saga1.getId(),
                AssociationValueDescriptor.fromValues(saga1.getAssociationValues()),
                serializer.serialize(saga1)
            );

            storage.insert(
                ClassNameInflector.classOf(saga2),
                saga2.getId(),
                AssociationValueDescriptor.fromValues(saga2.getAssociationValues()),
                serializer.serialize(saga2)
            );

            storage.remove(saga1.getId());

            expect(storage.findById(saga1.getId())).to.be.null;
        });

        it("is idempotent", () => {
            storage.remove("id1");
        });
    });

    describe("update", () => {
        it("updates the saga", () => {
            const associationValue = new AssociationValue("foo", "bar");
            const associationValue2 = new AssociationValue("baz", "boo");
            let saga = new MemorySagaStorageSpecSaga("id", new AssociationValues([associationValue]));

            storage.insert(
                "SomeSaga",
                saga.getId(),
                AssociationValueDescriptor.fromValues(saga.getAssociationValues()),
                serializer.serialize(saga)
            );

            const updatedAssociationValues = new AssociationValues([associationValue, associationValue2]);
            saga = new MemorySagaStorageSpecSaga("id", updatedAssociationValues);

            storage.update(
                "SomeSaga",
                saga.getId(),
                AssociationValueDescriptor.fromValues(saga.getAssociationValues()),
                serializer.serialize(saga)
            );

            const serializedSaga = storage.findById(saga.getId());
            const actualSaga = serializer.deserialize(serializedSaga, MemorySagaStorageSpecSaga);

            expect(actualSaga.getAssociationValues()).to.eql(updatedAssociationValues);
        });

        it("inserts the saga if it does not exist", () => {
            const saga = new MemorySagaStorageSpecSaga("id", new AssociationValues([]));

            storage.update(
                "SomeSaga",
                saga.getId(),
                AssociationValueDescriptor.fromValues(saga.getAssociationValues()),
                serializer.serialize(saga)
            );

            const serializedSaga = storage.findById(saga.getId());
            const actualSaga = serializer.deserialize(serializedSaga);

            expect(actualSaga).to.eql(saga);
        });
    });
});

class MemorySagaStorageSpecSaga extends Saga {
    public on(event: Event): void {}

    public isActive(): boolean {
        return true;
    }
}
