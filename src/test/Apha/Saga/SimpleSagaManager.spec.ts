
import * as sinon from "sinon";
import {SimpleSagaManager} from "../../../main/Apha/Saga/SimpleSagaManager";
import {SagaRepository} from "../../../main/Apha/Saga/SagaRepository";
import {GenericSagaFactory} from "../../../main/Apha/Saga/GenericSagaFactory";
import {AssociationValueResolver} from "./../../../main/Apha/Saga/Annotation/AssociationValueResolver";
import {Event} from "../../../main/Apha/Message/Event";
import {AssociationValues} from "../../../main/Apha/Saga/AssociationValues";
import {Saga} from "../../../main/Apha/Saga/Saga";
import {AssociationValue} from "../../../main/Apha/Saga/AssociationValue";
import {SagaStorage} from "../../../main/Apha/Saga/Storage/SagaStorage";
import {AssociationValueDescriptor} from "../../../main/Apha/Saga/Storage/AssociationValueDescriptor";
import {SagaSerializer} from "../../../main/Apha/Saga/SagaSerializer";
import {JsonSerializer} from "../../../main/Apha/Serialization/JsonSerializer";

describe("SimpleSagaManager", () => {
    let manager;

    let repositoryMock;
    let resolverMock;
    let factoryMock;

    beforeEach(() => {
        const types = [SimpleSagaManagerSpecSaga];
        const factory = new GenericSagaFactory<SimpleSagaManagerSpecSaga>();

        const storage = new SimpleSagaManagerSpecSagaStorage();
        const serializer = new SagaSerializer<SimpleSagaManagerSpecSaga>(new JsonSerializer(), factory);
        const repository = new SagaRepository<SimpleSagaManagerSpecSaga>(storage, serializer);

        const resolver = new SimpleSagaManagerSpecAssociationValueResolver();

        resolverMock = sinon.mock(resolver);
        repositoryMock = sinon.mock(repository);
        factoryMock = sinon.mock(factory);

        manager = new SimpleSagaManager(types, repository, resolver, factory);
    });

    describe("on", () => {
        it("delegates event to correct sagas", () => {
            const associationValue = new AssociationValue("foo", "bar");
            const associationValues = new AssociationValues([associationValue]);
            const sagaId = "sagaId";

            const saga = new SimpleSagaManagerSpecSaga(sagaId, associationValues);
            const sagaMock = sinon.mock(saga);

            const event = new SimpleSagaManagerSpecEvent();

            resolverMock.expects("extractAssociationValues")
                .once()
                .returns(associationValues);

            repositoryMock.expects("find")
                .once()
                .withArgs(SimpleSagaManagerSpecSaga, associationValue)
                .returns([sagaId]);

            repositoryMock.expects("load")
                .once()
                .withArgs(sagaId, SimpleSagaManagerSpecSaga)
                .returns(saga);

            repositoryMock.expects("commit")
                .once()
                .withArgs(saga);

            sagaMock.expects("on")
                .once()
                .withArgs(event);

            manager.on(event);

            resolverMock.verify();
            repositoryMock.verify();
            sagaMock.verify();
        });

        it("create new saga if none found because of saga creation policy", () => {
            const associationValue = new AssociationValue("foo", "bar");
            const associationValues = new AssociationValues([associationValue]);
            const sagaId = "sagaId";

            const saga = new SimpleSagaManagerSpecSaga(sagaId, associationValues);
            const sagaMock = sinon.mock(saga);

            const event = new SimpleSagaManagerSpecEvent();

            resolverMock.expects("extractAssociationValues")
                .once()
                .returns(associationValues);

            repositoryMock.expects("find")
                .once()
                .withArgs(SimpleSagaManagerSpecSaga, associationValue)
                .returns([]);

            repositoryMock.expects("load").never();

            repositoryMock.expects("commit")
                .once()
                .withArgs(saga);

            sagaMock.expects("on")
                .once()
                .withArgs(event);

            factoryMock.expects("createSaga")
                .once()
                .returns(saga);

            manager.on(event);

            resolverMock.verify();
            repositoryMock.verify();
            sagaMock.verify();
            factoryMock.verify();
        });
    });
});

class SimpleSagaManagerSpecEvent extends Event {
}

class SimpleSagaManagerSpecSaga extends Saga {
    public on(event: Event): void {}
    public isActive(): boolean {
        return true;
    }
}

class SimpleSagaManagerSpecAssociationValueResolver implements AssociationValueResolver {
    public extractAssociationValues(event: Event): AssociationValues {
        return null;
    }
}

class SimpleSagaManagerSpecSagaStorage implements SagaStorage {
    public insert(sagaClass: string, id: string, associationValues: AssociationValueDescriptor, data: string): void {}
    public update(sagaClass: string, id: string, associationValues: AssociationValueDescriptor, data: string): void {}
    public remove(id: string): void {}
    public findById(id: string): string {
        return "";
    }
    public find(sagaClass: string, associationValue: AssociationValueDescriptor): string[] {
        return [];
    }
}
