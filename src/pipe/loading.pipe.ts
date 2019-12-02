import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform, ɵisObservable, ɵisPromise } from '@angular/core';
import { Observable } from 'rxjs';

interface SubscriptionStrategy {
  createSubscription(async: any, updateLatestValue: any): any;

  dispose(subscription: any): void;

  onDestroy(subscription: any): void;
}

class PromiseStrategy implements SubscriptionStrategy {
  createSubscription(async: Promise<any>, updateLatestValue: (v: any) => any): any {
    return async.then(updateLatestValue, updateLatestValue);
  }

  dispose(subscription: any): void {
  }

  onDestroy(subscription: any): void {
  }
}

class ObservableStrategy implements SubscriptionStrategy {
  createSubscription(async: any, updateLatestValue: any): any {
    return async.subscribe({
      next: updateLatestValue,
      error: updateLatestValue,
    });
  }

  dispose(subscription: any): void {
    subscription.unsubscribe();
  }

  onDestroy(subscription: any): void {
    subscription.unsubscribe();
  }
}


const _promiseStrategy = new PromiseStrategy();
const _observableStrategy = new ObservableStrategy();

export class LoadingPipe implements OnDestroy, PipeTransform {

  private _value = false;

  private _subscription: any = null;

  private _obj: Observable<any> | Promise<any> | null;

  private _strategy: SubscriptionStrategy;

  constructor(private _ref: ChangeDetectorRef) {
  }

  ngOnDestroy(): void {
    if (this._obj) {
      this._dispose();
    }
  }

  transform(obj: Observable<any> | Promise<any>): boolean {
    if (obj !== this._obj && this._obj) {
      this._dispose();
    }

    if (!obj) {
      this._value = false;
      return this._value;
    }

    if (this._obj !== obj) {
      /**
       * Observable 的 subscribe 有可能是同步的，在同步 Observable 的情况中，this._value 的值
       * 会立即被改变成 false，故此处 this._value = true 比如在 this._subscribe 之前避免覆盖掉
       * _resolveLoading 的结果
       */
      this._value = true;
      this._subscribe(obj);
      return this._value;
    }

    return this._value;
  }

  private _subscribe(obj: Observable<any> | Promise<any>): void {
    this._obj = obj;
    this._strategy = this._selectStrategy(obj);

    this._subscription = this._strategy.createSubscription(obj, () => this._resolveLoading(obj));
  }

  private _selectStrategy(obj: Observable<any> | Promise<any>): any {
    if (ɵisPromise(obj)) {
      return _promiseStrategy;
    }

    if (ɵisObservable(obj)) {
      return _observableStrategy;
    }

    throw new Error('invalid pipe argument');
  }

  private _dispose(): void {
    this._strategy.dispose(this._subscription);
    this._value = false;
    this._subscription = null;
    this._obj = null;
  }

  private _resolveLoading(async: Observable<any> | Promise<any>): void {
    if (async !== this._obj) {
      return;
    }

    this._value = false;
    this._ref.markForCheck();
  }
}